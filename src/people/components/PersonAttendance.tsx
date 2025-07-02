import React, { memo, useCallback, useMemo } from "react";
import { useMountedState, ArrayHelper, ApiHelper, type AttendanceRecordInterface, DateHelper, type GroupInterface, UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Stack, 
  Chip, 
  Divider,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import {
  CalendarMonth as CalendarIcon,
  Church as ChurchIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  EventAvailable as EventIcon
} from "@mui/icons-material";

interface Props { personId: string }

export const PersonAttendance: React.FC<Props> = memo((props) => {
  const [records, setRecords] = React.useState<AttendanceRecordInterface[]>(null);
  const [groups, setGroups] = React.useState<GroupInterface[]>(null);
  const isMounted = useMountedState();

  const loadData = useCallback(() => {
    if (!UniqueIdHelper.isMissing(props.personId)) {
      ApiHelper.get("/attendancerecords?personId=" + props.personId, "AttendanceApi").then(data => {
        if(isMounted()) {
          setRecords(data);
        }});
      ApiHelper.get("/groups", "MembershipApi").then(data => {
        if(isMounted()) {
          setGroups(data);
        }});
    }
  }, [props.personId, isMounted]);

  const attendanceCards = useMemo(() => {
    if (!records || !groups) return null;
    
    if (records.length === 0) {
      return (
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center', 
            backgroundColor: 'grey.50',
            border: '1px dashed',
            borderColor: 'grey.300'
          }}
        >
          <EventIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {Locale.label("people.personAttendance.noAttMsg")}
          </Typography>
        </Paper>
      );
    }

    // Group records by date for better visual organization
    const groupedRecords = records.reduce((acc, record) => {
      const dateKey = DateHelper.formatHtml5Date(record.visitDate);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(record);
      return acc;
    }, {} as Record<string, AttendanceRecordInterface[]>);

    return Object.entries(groupedRecords)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, dateRecords]) => (
        <Card 
          key={date} 
          sx={{ 
            mb: 2, 
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: 2
            },
            '&:last-child': {
              mb: 0
            }
          }}
        >
          <CardContent sx={{ pb: '16px !important' }}>
            <Stack spacing={2}>
              {/* Date Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              {/* Attendance Records for this date */}
              <List sx={{ p: 0 }}>
                {dateRecords.map((record, index) => {
                  const group = ArrayHelper.getOne(groups, "id", record.groupId);
                  
                  return (
                    <ListItem 
                      key={`${date}-${index}`} 
                      sx={{ 
                        px: 0, 
                        py: 1,
                        '&:not(:last-child)': {
                          borderBottom: '1px solid',
                          borderColor: 'grey.100'
                        }
                      }}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                          {/* Campus */}
                          {record.campus?.name && (
                            <Chip
                              icon={<ChurchIcon />}
                              label={record.campus.name}
                              variant="outlined"
                              size="small"
                              sx={{ 
                                color: 'text.primary',
                                borderColor: 'primary.main',
                                '& .MuiChip-icon': { color: 'primary.main' }
                              }}
                            />
                          )}
                          
                          {/* Service */}
                          {record.service?.name && (
                            <Chip
                              icon={<EventIcon />}
                              label={record.service.name}
                              variant="outlined"
                              size="small"
                              sx={{ 
                                color: 'text.primary',
                                borderColor: 'secondary.main',
                                '& .MuiChip-icon': { color: 'secondary.main' }
                              }}
                            />
                          )}
                          
                          {/* Service Time */}
                          {record.serviceTime?.name && (
                            <Chip
                              icon={<ScheduleIcon />}
                              label={record.serviceTime.name}
                              variant="outlined"
                              size="small"
                              sx={{ 
                                color: 'text.primary',
                                borderColor: 'info.main',
                                '& .MuiChip-icon': { color: 'info.main' }
                              }}
                            />
                          )}
                          
                          {/* Group */}
                          {group && (
                            <Chip
                              icon={<GroupIcon />}
                              label={
                                <Link 
                                  to={`/groups/${group.id}`} 
                                  style={{ 
                                    textDecoration: 'none', 
                                    color: 'inherit',
                                    fontSize: 'inherit'
                                  }}
                                >
                                  {group.name}
                                </Link>
                              }
                              variant="outlined"
                              size="small"
                              clickable
                              sx={{ 
                                color: 'text.primary',
                                borderColor: 'success.main',
                                '& .MuiChip-icon': { color: 'success.main' },
                                '&:hover': {
                                  backgroundColor: 'success.light',
                                  borderColor: 'success.dark'
                                }
                              }}
                            />
                          )}
                        </Stack>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            </Stack>
          </CardContent>
        </Card>
      ));
  }, [records, groups]);

  React.useEffect(loadData, [props.personId, isMounted]);

  const content = useMemo(() => {
    if (!records || !groups) return <Loading size="sm" />;
    return (
      <Box sx={{
        '& .MuiCard-root': {
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'grey.200'
        },
        '& .MuiChip-root': {
          fontWeight: 500,
          fontSize: '0.875rem'
        }
      }}>
        {attendanceCards}
      </Box>
    );
  }, [records, groups, attendanceCards]);

  return content;
});

